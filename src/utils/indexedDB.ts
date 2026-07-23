/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, Layer } from '../types';

const DB_NAME = 'phototor_db';
const DB_VERSION = 2; // Bumped to add userId index for per-account isolation
const STORE_NAME = 'projects';

import { supabase } from '../lib/supabase';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
      } else {
        // Migrate existing store: add userId index if missing
        const store = (event.target as IDBOpenDBRequest).transaction!.objectStore(STORE_NAME);
        if (!store.indexNames.contains('userId')) {
          store.createIndex('userId', 'userId', { unique: false });
        }
      }
    };
  });
}

/**
 * Remove all locally cached projects that belong to OTHER users.
 * Call this after login/logout to prevent cross-account project leakage.
 */
export async function clearOtherUsersLocalProjects(currentUserId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const allProjects: any[] = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    for (const proj of allProjects) {
      if (proj.userId && proj.userId !== currentUserId) {
        store.delete(proj.id);
      }
    }
  } catch (e) {
    console.warn('Could not clear other users local projects:', e);
  }
}

// Convert image layer HTMLImageElement/imageUrl to Blobs before saving, and vice versa on load
export async function saveProject(project: Project, userId?: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  // Deep clone to avoid mutating running project state
  const serializedLayers = await Promise.all(
    project.layers.map(async (layer) => {
      const cloned: any = { ...layer };
      
      // Remove runtime render objects which can't be serialized
      delete cloned.imageElement;
      delete cloned.maskCanvas;
      
      // If we have an image URL but no blob, fetch it to save as blob
      if (cloned.imageUrl && !cloned.imageBlob) {
        try {
          if (cloned.imageUrl.startsWith('blob:')) {
            const res = await fetch(cloned.imageUrl);
            cloned.imageBlob = await res.blob();
          }
        } catch (e) {
          console.error('Failed to serialize layer image to Blob', e);
        }
      }
      return cloned;
    })
  );

  // Get userId from session if not provided
  let resolvedUserId = userId;
  if (!resolvedUserId) {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      resolvedUserId = session?.user?.id;
    } catch { /* offline */ }
  }

  const serializedProject: any = {
    ...project,
    userId: resolvedUserId || null, // Tag project with owner userId for per-account isolation
    layers: serializedLayers,
    updatedAt: Date.now(),
  };

  // 1. Save to local IndexedDB
  await new Promise<void>((resolve, reject) => {
    const request = store.put(serializedProject);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // 2. Sync to Supabase Database for logged-in user
  try {
    const session = (await supabase.auth.getSession()).data.session;
    const targetUserId = userId || session?.user?.id;
    if (targetUserId) {
      const dbLayers = serializedLayers.map((l: any) => {
        const clean = { ...l };
        delete clean.imageElement;
        delete clean.maskCanvas;
        delete clean.imageBlob;
        return clean;
      });

      await supabase.from('user_projects').upsert({
        id: project.id,
        user_id: targetUserId,
        name: project.name,
        width: project.width,
        height: project.height,
        data: {
          ...serializedProject,
          layers: dbLayers
        },
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    }
  } catch (e) {
    console.warn("Could not sync project to Supabase user_projects DB:", e);
  }
}

export async function loadProjects(userId?: string): Promise<Project[]> {
  let targetUserId = userId;
  if (!targetUserId) {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      targetUserId = session?.user?.id;
    } catch {}
  }

  // 1. Sync from Supabase DB first if logged in
  try {
    if (targetUserId) {
      const { data, error } = await supabase
        .from('user_projects')
        .select('*')
        .eq('user_id', targetUserId)
        .order('updated_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        for (const item of data) {
          if (item.data) {
            const dbProj = item.data as Project;
            store.put(dbProj);
          }
        }
      }
    }
  } catch (e) {
    console.warn("Could not fetch projects from Supabase DB:", e);
  }

  // 2. Fetch from IndexedDB — filter by userId for per-account isolation
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      let projects: any[] = request.result || [];

      // Filter: only show projects belonging to this user
      // Allow projects without userId (legacy/guest) only if no userId is provided
      if (targetUserId) {
        projects = projects.filter((p) => p.userId === targetUserId);
      } else {
        // Guest mode: only show projects without a userId tag
        projects = projects.filter((p) => !p.userId);
      }

      // Hydrate project URLs
      const hydrated = projects.map((p) => {
        p.layers = p.layers.map((layer: any) => {
          if (layer.imageBlob) {
            layer.imageUrl = URL.createObjectURL(layer.imageBlob);
          }
          return layer;
        });
        return p;
      });
      // Sort newest first
      hydrated.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(hydrated);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function loadProject(id: string): Promise<Project | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const project = request.result;
      if (!project) {
        resolve(null);
        return;
      }
      // Hydrate URLs
      project.layers = project.layers.map((layer: any) => {
        if (layer.imageBlob) {
          layer.imageUrl = URL.createObjectURL(layer.imageBlob);
        }
        return layer;
      });
      resolve(project);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteProject(id: string, userId?: string): Promise<void> {
  // 1. Delete from IndexedDB
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  await new Promise<void>((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // 2. Delete from Supabase DB
  try {
    const session = (await supabase.auth.getSession()).data.session;
    const targetUserId = userId || session?.user?.id;
    if (targetUserId) {
      await supabase.from('user_projects').delete().eq('id', id);
    }
  } catch (e) {
    console.warn("Could not delete project from Supabase DB:", e);
  }
}

// Hydrate HTMLImageElement runtime cache for a layer
export function hydrateLayerImage(layer: Layer): Promise<Layer> {
  return new Promise((resolve) => {
    if (layer.type !== 'image' || !layer.imageUrl) {
      resolve(layer);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      layer.imageElement = img;
      resolve(layer);
    };
    img.onerror = () => {
      console.error('Failed to load layer image element', layer.imageUrl);
      resolve(layer);
    };
    img.src = layer.imageUrl;
  });
}

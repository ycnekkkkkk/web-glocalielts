/**
 * IndexedDB Storage for IELTS Mock Skill Exam
 * Dùng để lưu tạm audio Speaking và bài làm của thí sinh trên trình duyệt.
 * Giúp dữ liệu không bao giờ bị mất khi F5, reload trang hoặc chuyển bước.
 */

const DB_NAME = "glocal_ielts_mock_exam_db";
const DB_VERSION = 1;
const STORE_SPEAKING = "speaking_audios";
const STORE_DRAFTS = "exam_drafts";

export interface StoredAudio {
  id: number; // question index
  examSlug: string;
  blob: Blob;
  mimeType: string;
  duration: number;
  updatedAt: number;
}

export interface StoredDraft {
  examSlug: string;
  step: string;
  listeningPicks: Record<string, string | number>;
  readingPicks: Record<string, string | number>;
  writingValues: { task1: string; task2: string };
  flaggedQuestions: string[];
  startedAt: number;
  lastSavedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SPEAKING)) {
        const store = db.createObjectStore(STORE_SPEAKING, { keyPath: ["examSlug", "id"] });
        store.createIndex("by_exam", "examSlug", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS, { keyPath: "examSlug" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Lưu 1 file ghi âm Speaking vào IndexedDB
 */
export async function saveSpeakingAudioToIDB(
  examSlug: string,
  id: number,
  blob: Blob,
  duration: number
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SPEAKING, "readwrite");
      const store = tx.objectStore(STORE_SPEAKING);
      const item: StoredAudio = {
        id,
        examSlug,
        blob,
        mimeType: blob.type,
        duration,
        updatedAt: Date.now(),
      };
      store.put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] saveSpeakingAudio failed:", err);
  }
}

/**
 * Tải toàn bộ các file ghi âm Speaking của đề thi này từ IndexedDB
 */
export async function loadSpeakingAudiosFromIDB(
  examSlug: string
): Promise<Record<number, { blob: Blob; url: string; duration: number }>> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SPEAKING, "readonly");
      const store = tx.objectStore(STORE_SPEAKING);
      const index = store.index("by_exam");
      const request = index.getAll(IDBKeyRange.only(examSlug));

      request.onsuccess = () => {
        const items = request.result as StoredAudio[];
        const out: Record<number, { blob: Blob; url: string; duration: number }> = {};
        for (const item of items) {
          out[item.id] = {
            blob: item.blob,
            url: URL.createObjectURL(item.blob),
            duration: item.duration,
          };
        }
        resolve(out);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] loadSpeakingAudios failed:", err);
    return {};
  }
}

/**
 * Xóa toàn bộ audio Speaking của đề thi này (khi đã nộp bài thành công)
 */
export async function clearSpeakingAudiosFromIDB(examSlug: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SPEAKING, "readwrite");
      const store = tx.objectStore(STORE_SPEAKING);
      const index = store.index("by_exam");
      const request = index.getAllKeys(IDBKeyRange.only(examSlug));

      request.onsuccess = () => {
        const keys = request.result;
        for (const key of keys) {
          store.delete(key);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] clearSpeakingAudios failed:", err);
  }
}

/**
 * Lưu toàn bộ draft bài thi vào IndexedDB (đảm bảo không bị giới hạn 5MB như LocalStorage)
 */
export async function saveExamDraftToIDB(draft: StoredDraft): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, "readwrite");
      const store = tx.objectStore(STORE_DRAFTS);
      store.put(draft);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] saveExamDraft failed:", err);
  }
}

/**
 * Đọc draft bài thi từ IndexedDB
 */
export async function loadExamDraftFromIDB(examSlug: string): Promise<StoredDraft | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, "readonly");
      const store = tx.objectStore(STORE_DRAFTS);
      const request = store.get(examSlug);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] loadExamDraft failed:", err);
    return null;
  }
}

/**
 * Xóa draft bài thi sau khi nộp thành công
 */
export async function clearExamDraftFromIDB(examSlug: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, "readwrite");
      const store = tx.objectStore(STORE_DRAFTS);
      store.delete(examSlug);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] clearExamDraft failed:", err);
  }
}

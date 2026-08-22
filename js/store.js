import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import {
  getFirestore, collection, addDoc, getDocs, query, where, orderBy, limit,
  doc, updateDoc, deleteDoc, onSnapshot
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

const cfg = window.MURAL_CONFIG || {};
if (!cfg.FIREBASE_CONFIG?.projectId) throw new Error('Firebase não configurado em /config.js');

const app = initializeApp(cfg.FIREBASE_CONFIG);
const db = getFirestore(app);
const postsRef = collection(db, 'alice_posts');

const mapDoc = snap => ({ id: snap.id, ...snap.data() });

async function compressImage(file) {
  if (!file) return '';
  if (!file.type.startsWith('image/')) throw new Error('Arquivo inválido. Envie uma imagem.');

  const bitmap = await createImageBitmap(file);
  const max = Number(cfg.IMAGE_MAX_DIMENSION || 1280);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  let width = Math.max(1, Math.round(bitmap.width * scale));
  let height = Math.max(1, Math.round(bitmap.height * scale));
  let quality = Number(cfg.IMAGE_JPEG_QUALITY || 0.78);
  const maxChars = Number(cfg.IMAGE_MAX_DATAURL_CHARS || 680000);

  async function render(w, h, q) {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', q);
  }

  let dataUrl = await render(width, height, quality);
  let rounds = 0;
  while (dataUrl.length > maxChars && rounds < 6) {
    rounds++;
    if (quality > 0.48) quality -= 0.10;
    else { width = Math.round(width * 0.82); height = Math.round(height * 0.82); }
    dataUrl = await render(width, height, quality);
  }
  bitmap.close?.();
  if (dataUrl.length > maxChars) throw new Error('A foto ficou grande demais. Tente outra imagem.');
  return dataUrl;
}

const MuralStore = {
  async listApproved() {
    const q = query(postsRef, where('status', '==', 'approved'), limit(60));
    return (await getDocs(q)).docs.map(mapDoc).sort((a,b)=>(b.created_at||0)-(a.created_at||0));
  },
  async listAll() {
    const q = query(postsRef, orderBy('created_at', 'desc'), limit(200));
    return (await getDocs(q)).docs.map(mapDoc);
  },
  async create(post) {
    const row = {
      name: (post.name || 'Anônimo').slice(0, 40),
      message: (post.message || '').slice(0, 180),
      image_url: post.image_url || '',
      status: 'approved',
      source: 'qr',
      created_at: Date.now()
    };
    const ref = await addDoc(postsRef, row);
    return { id: ref.id, ...row };
  },
  async setStatus(id, status) {
    await updateDoc(doc(db, 'alice_posts', id), { status, moderated_at: Date.now() });
  },
  async remove(id) {
    await deleteDoc(doc(db, 'alice_posts', id));
  },
  async uploadImage(file) {
    return compressImage(file);
  },
  subscribe(cb) {
    const q = query(postsRef, orderBy('created_at', 'desc'), limit(200));
    const unsub = onSnapshot(q, () => cb(), err => console.error('Firestore realtime:', err));
    return unsub;
  },
  isCloud() { return true; },
  cloudName() { return 'Firebase'; }
};

window.MuralStore = MuralStore;
export { MuralStore };

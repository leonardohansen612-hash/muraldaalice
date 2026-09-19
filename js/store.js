import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import {
  getFirestore, collection, addDoc, getDocs, query, orderBy, limit,
  doc, updateDoc, deleteDoc, onSnapshot
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

const cfg = window.MURAL_CONFIG || {};
if (!cfg.FIREBASE_CONFIG?.projectId) throw new Error('Firebase não configurado em /config.js');

const app = initializeApp(cfg.FIREBASE_CONFIG);
const db = getFirestore(app);

// IMPORTANTE: usa exatamente a mesma coleção e o mesmo formato de documento
// do Mural da Alice. Assim funciona com as permissões Firebase já publicadas.
const postsRef = collection(db, 'alice_posts');
const MARI_PREFIX = '__MARI__';

function mapDoc(snap) {
  const data = snap.data();
  const rawName = String(data.name || 'Anônimo');
  return {
    id: snap.id,
    ...data,
    name: rawName.startsWith(MARI_PREFIX) ? (rawName.slice(MARI_PREFIX.length) || 'Anônimo') : rawName,
    _isMari: rawName.startsWith(MARI_PREFIX)
  };
}

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
    const q = query(postsRef, orderBy('created_at', 'desc'), limit(200));
    return (await getDocs(q)).docs.map(mapDoc)
      .filter(p => p._isMari && p.status === 'approved')
      .slice(0, 60);
  },
  async listAll() {
    const q = query(postsRef, orderBy('created_at', 'desc'), limit(200));
    return (await getDocs(q)).docs.map(mapDoc).filter(p => p._isMari);
  },
  async create(post) {
    // Mantém EXATAMENTE os mesmos campos do Alice; o identificador da Mari
    // fica dentro do campo name para não exigir nenhuma regra nova no Firebase.
    const visibleName = (post.name || 'Anônimo').trim() || 'Anônimo';
    const maxVisible = Math.max(1, 40 - MARI_PREFIX.length);
    const row = {
      name: MARI_PREFIX + visibleName.slice(0, maxVisible),
      message: (post.message || '').slice(0, 180),
      image_url: post.image_url || '',
      status: 'approved',
      source: 'qr',
      created_at: Date.now()
    };
    const ref = await addDoc(postsRef, row);
    return { id: ref.id, ...row, name: visibleName, _isMari: true };
  },
  async setStatus(id, status) {
    await updateDoc(doc(db, 'alice_posts', id), { status, moderated_at: Date.now() });
  },
  async remove(id) {
    await deleteDoc(doc(db, 'alice_posts', id));
  },
  async uploadImage(file) { return compressImage(file); },
  subscribe(cb) {
    const q = query(postsRef, orderBy('created_at', 'desc'), limit(200));
    return onSnapshot(q, () => cb(), err => console.error('Firestore realtime:', err));
  },
  isCloud() { return true; },
  cloudName() { return 'Firebase'; }
};

window.MuralStore = MuralStore;
export { MuralStore };

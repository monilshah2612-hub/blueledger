// Thin adapter between BlueLedger's sync engine and Firebase (Auth + Firestore).
// Data layout:  users/{uid}/records/{collection~id}  -> { c, id, u, del, data }
//               users/{uid}/photos/{photoId}         -> { data }
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { initializeFirestore, collection, doc, writeBatch, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

window.BLFirebase = {
  create(cfg) {
    const app = initializeApp(cfg);
    const auth = getAuth(app);
    const fs = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
    const uid = () => { if (!auth.currentUser) throw new Error('Not signed in'); return auth.currentUser.uid; };
    return {
      onAuth(cb) { return onAuthStateChanged(auth, u => cb(u ? { uid: u.uid, email: u.email } : null)); },
      signUp: (e, p) => createUserWithEmailAndPassword(auth, e, p),
      signIn: (e, p) => signInWithEmailAndPassword(auth, e, p),
      resetPassword: e => sendPasswordResetEmail(auth, e),
      signOut: () => signOut(auth),
      // onDocs(docs, isFirst): first call = everything from the server, later calls = changes only
      subscribe(onDocs, onError) {
        let gotServer = false;
        const col = collection(fs, 'users', uid(), 'records');
        return onSnapshot(col, snap => {
          if (!gotServer && snap.metadata.fromCache) return; // ignore an empty cache before the server answers
          const first = !gotServer; gotServer = true;
          const docs = [];
          snap.docChanges().forEach(ch => { if (ch.type !== 'removed') docs.push(ch.doc.data()); });
          onDocs(docs, first);
        }, err => onError && onError(err));
      },
      async push(docs) {
        const id = uid();
        for (let i = 0; i < docs.length; i += 400) {
          const b = writeBatch(fs);
          docs.slice(i, i + 400).forEach(d => b.set(doc(fs, 'users', id, 'records', d.c + '~' + d.id), { c: d.c, id: d.id, u: d.u, del: !!d.del, data: d.data || '' }));
          await b.commit();
        }
      },
      putPhoto: (pid, data) => setDoc(doc(fs, 'users', uid(), 'photos', pid), { data }),
      async getPhoto(pid) { const s = await getDoc(doc(fs, 'users', uid(), 'photos', pid)); return s.exists() ? s.data().data : null; }
    };
  }
};

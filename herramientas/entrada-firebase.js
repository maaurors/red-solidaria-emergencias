// Punto de entrada para empaquetar SOLO las funciones de Firebase que usa SinVisto.
// El resultado (js/vendor/firebase.js) se aloja en el propio sitio: la CSP sigue siendo script-src 'self'.
import { initializeApp } from "firebase/app";
import {
  initializeAuth, browserLocalPersistence, onAuthStateChanged, sendSignInLinkToEmail,
  isSignInWithEmailLink, signInWithEmailLink, signOut, deleteUser, connectAuthEmulator
} from "firebase/auth";
import {
  initializeFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch,
  query, orderBy, limit, onSnapshot, connectFirestoreEmulator
} from "firebase/firestore";

window.SinVistoFirebase = Object.freeze({
  initializeApp,
  initializeAuth, browserLocalPersistence, onAuthStateChanged, sendSignInLinkToEmail,
  isSignInWithEmailLink, signInWithEmailLink, signOut, deleteUser, connectAuthEmulator,
  initializeFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch,
  query, orderBy, limit, onSnapshot, connectFirestoreEmulator
});

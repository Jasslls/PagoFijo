import { initializeApp } from "firebase/app";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithCredential,
    signOut,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Platform } from "react-native";

const firebaseConfig = {
    apiKey: "AIzaSyCobgv9hPviWWJF6OJig00mJzXU4vhtnhs",
    authDomain: "pagofijo-64c8f.firebaseapp.com",
    projectId: "pagofijo-64c8f",
    storageBucket: "pagofijo-64c8f.firebasestorage.app",
    messagingSenderId: "575779505449",
    appId: "1:575779505449:web:80b40df1de547caf53a338",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogleToken(idToken: string) {
    const credential = GoogleAuthProvider.credential(idToken);
    return signInWithCredential(auth, credential);
}

export async function signOutFirebase() {
    return signOut(auth);
}

export async function uploadImageAsync(uid: string, uri: string): Promise<string> {
    if (!uri) return "";
    
    // Si ya es una URL permanente de Firebase Storage, no hace falta volver a subirla
    if (uri.startsWith("https://firebasestorage.googleapis.com")) {
        return uri;
    }

    try {
        let blob: Blob;
        if (Platform.OS === "web" || uri.startsWith("data:") || uri.startsWith("blob:")) {
            const response = await fetch(uri);
            blob = await response.blob();
        } else {
            // En plataformas nativas, XMLHttpRequest es mucho más confiable para URIs locales file://
            blob = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.onload = function () {
                    resolve(xhr.response as Blob);
                };
                xhr.onerror = function (e) {
                    console.error("XHR error loading local file:", e);
                    reject(new TypeError("Error de red al cargar el archivo local"));
                };
                xhr.responseType = "blob";
                xhr.open("GET", uri, true);
                xhr.send(null);
            });
        }

        const filename = `users/${uid}/invoices/${Date.now()}_proof.jpg`;
        const storageRef = ref(storage, filename);

        await uploadBytes(storageRef, blob);
        
        if (typeof blob.close === "function") {
            blob.close();
        }

        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error("Error en uploadImageAsync:", error);
        throw error;
    }
}

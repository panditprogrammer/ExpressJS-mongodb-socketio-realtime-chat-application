import firebaseAdmin from 'firebase-admin';

const firebaseInit = async () => {

    try {
        // init firebase 
        firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert("src/config/firebase.json")
        });
        console.log("Firebase init successfully");
        
    } catch (error) {
        console.error("Firebase initialization failed", error);
        process.exit(1)
    }

}

export default firebaseInit;
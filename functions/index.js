const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Cloud Function to delete a user from Firebase Authentication
 * Only admins and super_admins can delete users
 * Users cannot delete themselves or users with higher privileges
 */
exports.deleteUser = functions.https.onCall(async (data, context) => {
  // Verify the caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Debe iniciar sesión para realizar esta acción"
    );
  }

  const callerEmail = context.auth.token.email;
  const { emailToDelete } = data;

  if (!emailToDelete) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Se requiere el email del usuario a eliminar"
    );
  }

  // Prevent self-deletion
  if (callerEmail.toLowerCase() === emailToDelete.toLowerCase()) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "No puede eliminarse a sí mismo"
    );
  }

  try {
    // Get the caller's role from Firestore
    const callerDoc = await admin.firestore()
      .collection("usuarios")
      .doc(callerEmail.toLowerCase())
      .get();

    if (!callerDoc.exists) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Usuario no encontrado en el sistema"
      );
    }

    const callerData = callerDoc.data();
    const callerRole = callerData.rol;
    const callerActive = callerData.activo === true || callerData.activo === "true";

    // Check if caller is active
    if (!callerActive) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Su cuenta está desactivada"
      );
    }

    // Check if caller has admin privileges
    if (callerRole !== "super_admin" && callerRole !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "No tiene permisos para eliminar usuarios"
      );
    }

    // Get the user to delete's info from Firestore (for role check)
    const targetDoc = await admin.firestore()
      .collection("usuarios")
      .doc(emailToDelete.toLowerCase())
      .get();

    if (targetDoc.exists) {
      const targetData = targetDoc.data();
      const targetRole = targetData.rol;

      // Admins cannot delete super_admins or other admins
      if (callerRole === "admin") {
        if (targetRole === "super_admin" || targetRole === "admin") {
          throw new functions.https.HttpsError(
            "permission-denied",
            "No tiene permisos para eliminar este usuario"
          );
        }
      }
    }

    // Get the user from Firebase Auth by email
    const userRecord = await admin.auth().getUserByEmail(emailToDelete.toLowerCase());

    // Delete from Firebase Auth
    await admin.auth().deleteUser(userRecord.uid);

    // Delete from Firestore (in case it wasn't deleted yet)
    await admin.firestore()
      .collection("usuarios")
      .doc(emailToDelete.toLowerCase())
      .delete();

    return {
      success: true,
      message: `Usuario ${emailToDelete} eliminado correctamente`
    };

  } catch (error) {
    console.error("Error deleting user:", error);

    // If it's already an HttpsError, re-throw it
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Handle specific Firebase Auth errors
    if (error.code === "auth/user-not-found") {
      // User doesn't exist in Auth, but we should still try to clean up Firestore
      try {
        await admin.firestore()
          .collection("usuarios")
          .doc(emailToDelete.toLowerCase())
          .delete();
        return {
          success: true,
          message: `Usuario ${emailToDelete} eliminado de Firestore (no existía en Auth)`
        };
      } catch (firestoreError) {
        throw new functions.https.HttpsError(
          "internal",
          "Error al eliminar usuario de Firestore"
        );
      }
    }

    throw new functions.https.HttpsError(
      "internal",
      "Error al eliminar el usuario: " + error.message
    );
  }
});

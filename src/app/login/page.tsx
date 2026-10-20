"use client";

import { FirebaseError } from "firebase/app";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { MapPinned } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientAuth } from "@/lib/firebase";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    const auth = getClientAuth();
    try {
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: await user.getIdToken() }),
      });
      await signOut(auth);
      if (response.status === 403) {
        setError("Este email não tem acesso.");
        return;
      }
      if (!response.ok)
        throw new Error(`Session request failed: ${response.status}`);
      window.location.assign("/");
    } catch (signInError) {
      if (
        signInError instanceof FirebaseError &&
        signInError.code === "auth/popup-closed-by-user"
      ) {
        return;
      }
      console.error(signInError);
      setError("Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPinned className="size-5" />
            Route Planner
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button className="w-full" disabled={loading} onClick={handleSignIn}>
            Entrar com Google
          </Button>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default Login;

import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { AssistantInterface } from "./components/AssistantInterface";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-primary">Inclusive AI Assistant</h2>
        <Authenticated>
          <SignOutButton />
        </Authenticated>
      </header>
      <main className="flex-1 p-4">
        <Content />
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Authenticated>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">
            Welcome to Your AI Assistant
          </h1>
          <p className="text-xl text-secondary mb-2">
            Hello, {loggedInUser?.email ?? "friend"}!
          </p>
          <p className="text-lg text-gray-600">
            Choose your accessibility mode to get started
          </p>
        </div>
        <AssistantInterface />
      </Authenticated>
      
      <Unauthenticated>
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-4xl font-bold text-primary mb-4">
            Inclusive AI Assistant
          </h1>
          <p className="text-xl text-secondary mb-8">
            An AI assistant designed for vision, hearing, and speech accessibility
          </p>
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}

import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "./mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export const authOptions: NextAuthOptions = {
    adapter: MongoDBAdapter(clientPromise, {
        databaseName: "leetcode",
        collections: {
            Users: "users",
            Accounts: "accounts",
            Sessions: "sessions",
            VerificationTokens: "verification_tokens"
        },
    }),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
        }),
        GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
        }),
    ],
    session: {
        strategy: "jwt", // Use JWT for session - compatible with Express backend
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },
    callbacks: {
        async jwt({ token, user, trigger }) {
            // On initial sign in, add user data to token
            if (user) {
                token.userId = user.id;
                token.userName = (user as any).name || null;
                token.leetcode_username = (user as any).leetcode_username || null;
            }

            // On session update (e.g., after completing profile or updating name), refetch user data
            // The allowDangerousEmailAccountLinking setting prevents OAuthAccountNotLinked errors
            if (trigger === "update" && token.sub) {
                try {
                    const client = await clientPromise;
                    const db = client.db("leetcode");
                    const dbUser = await db.collection("users").findOne({
                        _id: new ObjectId(token.sub)
                    });
                    if (dbUser) {
                        token.userName = dbUser.name || null;
                        token.leetcode_username = dbUser.leetcode_username || null;
                    }
                } catch (error) {
                    console.error("Error fetching user data on session update:", error);
                }
            }

            // Generate a backend-compatible JWT token
            // This token can be used to authenticate with the Express backend
            if (token.sub) {
                const backendToken = jwt.sign(
                    { userId: token.sub },
                    process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET!,
                    { expiresIn: "7d" }
                );
                token.backendToken = backendToken;
            }

            return token;
        },
        async session({ session, token }) {
            // Pass the backend-compatible token to the client session
            if (session.user) {
                (session.user as any).id = token.sub;
                (session.user as any).name = token.userName;
                (session.user as any).leetcode_username = token.leetcode_username;
                (session as any).backendToken = token.backendToken;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    events: {
        async createUser({ user }) {
            // When a new user is created via OAuth, they'll need to complete their profile
            console.log("New user created:", user.email);
        },
    },
};

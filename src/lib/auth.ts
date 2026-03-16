import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import getDb from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const db = getDb();
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(credentials.username) as any;

        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isValid) return null;

        return {
          id: String(user.id),
          name: user.display_name,
          email: user.username,
          role: user.role,
          timezone: user.timezone,
          tz_label: user.tz_label,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.timezone = (user as any).timezone;
        token.tz_label = (user as any).tz_label;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).timezone = token.timezone;
        (session.user as any).tz_label = token.tz_label;
        (session.user as any).userId = token.userId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Middleware to verify if the requester is the master admin
const verifyMasterAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No authorization header" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (user.email !== 'adminnovo@gmail.com') {
      return res.status(403).json({ error: "Forbidden: Not master admin" });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: "Internal server error during auth" });
  }
};

// API route to change user password (Master Admin only)
app.post("/api/admin/change-password", verifyMasterAdmin, async (req, res) => {
  const { userId, newPassword } = req.body;

  if (!userId || !newPassword) {
    return res.status(400).json({ error: "User ID and new password are required" });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: "Senha alterada com sucesso!" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro ao alterar senha" });
  }
});

// API route to delete user (Master Admin only)
app.post("/api/admin/delete-user", verifyMasterAdmin, async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: "Usuário removido da autenticação com sucesso!" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro ao remover usuário" });
  }
});

// API route to delete user by email (Master Admin only)
app.post("/api/admin/delete-user-by-email", verifyMasterAdmin, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "E-mail é obrigatório" });
  }

  try {
    // List users to find the one with this email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) throw listError;

    const userToDelete = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!userToDelete) {
      return res.status(404).json({ error: "Usuário não encontrado no Supabase Autenticação." });
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userToDelete.id);

    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }

    res.json({ message: `Conta ${email} removida com sucesso do Supabase!` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro ao remover usuário por e-mail" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

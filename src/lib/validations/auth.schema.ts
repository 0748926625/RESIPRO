import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "L'email est requis.").email("Adresse email invalide."),
  password: z.string().min(1, "Le mot de passe est requis."),
  next: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const magicLinkSchema = z.object({
  email: z.string().min(1, "L'email est requis.").email("Adresse email invalide."),
  next: z.string().optional(),
});

export type MagicLinkInput = z.infer<typeof magicLinkSchema>;

// Matches the two self-selectable roles enforced server-side in
// supabase/migrations/0016_signup_role_selection.sql — "super_admin" is deliberately absent.
export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Le nom complet est requis."),
    email: z.string().min(1, "L'email est requis.").email("Adresse email invalide."),
    phone: z
      .string()
      .min(8, "Numéro de téléphone invalide.")
      .max(20, "Numéro de téléphone invalide."),
    role: z.enum(["client", "owner"], { message: "Sélectionnez un type de compte." }),
    password: z.string().min(8, "8 caractères minimum."),
    passwordConfirmation: z.string().min(1, "Confirmez le mot de passe."),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["passwordConfirmation"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "L'email est requis.").email("Adresse email invalide."),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "8 caractères minimum."),
    passwordConfirmation: z.string().min(1, "Confirmez le mot de passe."),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["passwordConfirmation"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

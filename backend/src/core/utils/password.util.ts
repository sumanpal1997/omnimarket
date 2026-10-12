import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export class PasswordUtil {
  /**
   * Hashes a raw password string using bcrypt with 12 salt rounds
   */
  public static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compares raw plain-text password with stored bcrypt hash in constant time
   */
  public static async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

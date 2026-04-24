import bcrypt from "bcrypt";
import logger from "../Utils/logger.js";

export const hashPassword = async (password: string): Promise<string> => {
  if (!password) {
    throw new Error("Password is required.");
  }

  const saltRounds = 10;

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    logger.error((error as Error).message);
    throw new Error("Password hashing failed.");
  }
};

export const comparePasswords = async (password: string, hashedPassword: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    logger.error((error as Error).message);
    throw new Error("Password comparison failed.");
  }
};

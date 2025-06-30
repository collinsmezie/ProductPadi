import bcrypt from "bcrypt";

export const handleHashedPassword = async (password: string) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    return hashedPassword;
  } catch (error: any) {
    console.error("Error hashing password:", error);
    throw error;
  }
};

export const comparePassword = async (password: string, userPassword: string) => {
  try {
    const isMatch = await bcrypt.compare(password, userPassword);
    return isMatch;
  } catch (error: any) {
    console.error("Error comparing passwords:", error);
    throw error;
  }
};

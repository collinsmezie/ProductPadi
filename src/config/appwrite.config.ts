import { Account, Client, Storage } from "appwrite";

const client = new Client()
  .setEndpoint("https://cloud.appwrite.io/v1")
  .setProject(process.env.APPWRITE_PROJECT_ID!);

export const storage = new Storage(client);

export const bucketId = process.env.APPWRITE_BUCKET_ID;
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase configuration in environment variables");
}

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

export const storage = {
  async uploadDocument(bucket, fileName, fileBuffer, contentType = "application/pdf") {
    try {
      if (!supabase) {
        throw new Error("Supabase client is not configured");
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileBuffer, {
          contentType,
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: publicUrl } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return {
        path: data.path,
        url: publicUrl.publicUrl,
      };
    } catch (error) {
      throw new Error(`Supabase storage error: ${error.message}`);
    }
  },

  async deleteDocument(bucket, fileName) {
    try {
      if (!supabase) {
        throw new Error("Supabase client is not configured");
      }

      const { error } = await supabase.storage
        .from(bucket)
        .remove([fileName]);

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw new Error(`Supabase storage delete error: ${error.message}`);
    }
  },

  async getPublicUrl(bucket, fileName) {
    if (!supabase) {
      throw new Error("Supabase client is not configured");
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  },
};

export default storage;

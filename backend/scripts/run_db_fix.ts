import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from backend root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { query } from '../db';
import fs from 'fs';

async function run() {
    try {
        console.log('Running DB fix to convert team_category_enum to TEXT...');

        // Ensure connection strings are available
        if (!process.env.DATABASE_URL) {
            console.error('Error: DATABASE_URL environment variable not found. Make sure .env exists in backend root.');
            process.exit(1);
        }

        const sql = `
            DO $$
            BEGIN
                -- 1. Alter the column to TEXT
                IF EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'teams' AND column_name = 'category' AND data_type = 'USER-DEFINED'
                ) THEN
                    ALTER TABLE teams ALTER COLUMN category TYPE TEXT;
                    RAISE NOTICE 'Converted teams.category to TEXT';
                ELSE
                    RAISE NOTICE 'teams.category is already TEXT or not a user-defined enum';
                END IF;

                -- 2. Drop the enum type if it exists
                IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_category_enum') THEN
                    DROP TYPE team_category_enum;
                    RAISE NOTICE 'Dropped type team_category_enum';
                END IF;
            END $$;
        `;

        await query(sql);
        console.log('✅ DB fix applied successfully.');
        process.exit(0);

    } catch (err: any) {
        console.error('❌ Failed to apply DB fix:', err.message);
        process.exit(1);
    }
}

run();

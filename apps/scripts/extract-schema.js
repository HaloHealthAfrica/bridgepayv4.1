/**
 * Schema Extraction Script
 * Extracts database schema from existing database
 * 
 * Usage: node scripts/extract-schema.js > database/schema-extracted.sql
 */

import sql from '../web/src/app/api/utils/sql.js';

async function extractSchema() {
  console.log('-- Extracted Database Schema');
  console.log('-- Generated:', new Date().toISOString());
  console.log('');

  try {
    // Get all tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    console.log(`-- Found ${tables.length} tables\n`);

    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`-- Table: ${tableName}`);
      console.log(`-- ${'='.repeat(50)}`);

      // Get columns
      const columns = await sql`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        ORDER BY ordinal_position
      `;

      console.log(`\nCREATE TABLE IF NOT EXISTS ${tableName} (`);
      
      const columnDefs = [];
      for (const col of columns) {
        let def = `  ${col.column_name} ${col.data_type}`;
        
        if (col.character_maximum_length) {
          def += `(${col.character_maximum_length})`;
        }
        
        if (col.is_nullable === 'NO') {
          def += ' NOT NULL';
        }
        
        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }
        
        columnDefs.push(def);
      }

      // Get primary keys
      const primaryKeys = await sql`
        SELECT column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = ${tableName}
          AND tc.constraint_type = 'PRIMARY KEY'
      `;

      if (primaryKeys.length > 0) {
        const pkCols = primaryKeys.map(pk => pk.column_name).join(', ');
        columnDefs.push(`  PRIMARY KEY (${pkCols})`);
      }

      // Get foreign keys
      const foreignKeys = await sql`
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = ${tableName}
      `;

      for (const fk of foreignKeys) {
        columnDefs.push(
          `  FOREIGN KEY (${fk.column_name}) REFERENCES ${fk.foreign_table_name}(${fk.foreign_column_name})`
        );
      }

      console.log(columnDefs.join(',\n'));
      console.log(');\n');

      // Get indexes
      const indexes = await sql`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = ${tableName}
          AND indexname NOT LIKE '%_pkey'
      `;

      if (indexes.length > 0) {
        console.log('-- Indexes:');
        for (const idx of indexes) {
          console.log(`${idx.indexdef};`);
        }
        console.log('');
      }
    }

    console.log('-- End of schema extraction');
  } catch (error) {
    console.error('Error extracting schema:', error);
    process.exit(1);
  }
}

extractSchema();




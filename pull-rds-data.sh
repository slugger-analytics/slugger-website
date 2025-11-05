#!/bin/bash
# Clone complete database schema and data from AWS RDS to local PostgreSQL

set -e

echo "🔄 Cloning RDS database to local..."
echo ""

# Load RDS credentials from .env
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    exit 1
fi

export $(cat .env | grep -v '^#' | xargs)

# Check if local postgres container is running
if ! docker ps | grep -q slugger-postgres-local; then
    echo "❌ Local postgres container is not running."
    echo "Start it with: npm run db:local:start"
    exit 1
fi

echo "📥 Step 1/4: Dumping schema from RDS..."
docker run --rm -e PGPASSWORD="$DB_PASSWORD" postgres:15 \
  pg_dump -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_NAME" \
  --schema-only --no-owner --no-privileges \
  > /tmp/rds-schema.sql

echo "📥 Step 2/4: Dumping data from RDS..."
docker run --rm -e PGPASSWORD="$DB_PASSWORD" postgres:15 \
  pg_dump -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_NAME" \
  --data-only --no-owner --no-privileges --column-inserts \
  --disable-triggers \
  > /tmp/rds-data.sql

echo "🗑️  Step 3/4: Resetting local database..."
docker exec -i slugger-postgres-local psql -U postgres -d slugger_local \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" > /dev/null

echo "📤 Step 4/4: Loading schema and data..."
docker exec -i slugger-postgres-local psql -U postgres -d slugger_local < /tmp/rds-schema.sql > /dev/null
docker exec -i slugger-postgres-local psql -U postgres -d slugger_local < /tmp/rds-data.sql > /dev/null

echo "🧹 Cleaning up..."
rm /tmp/rds-schema.sql /tmp/rds-data.sql

echo ""
echo "✅ Clone complete!"
echo ""
echo "📊 Verify data:"
echo "  docker exec -it slugger-postgres-local psql -U postgres -d slugger_local -c '\\dt'"
echo "  docker exec -it slugger-postgres-local psql -U postgres -d slugger_local -c 'SELECT COUNT(*) FROM users;'"

# Stockholm-Hackathon

We are building a video-fact checker Chrome extension.





Setup Instructions

1. Backend Setup
```
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file to include all the api keys
touch .env

OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```
2. DB Setup

```aiignore
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Start Supabase locally
cd backend
supabase start
```

3. Frontend Setup

```aiignore
# Navigate to frontend directory
cd frontend

# Install dependencies
pnpm install

# Create environment file
cp env.example .env.local
```

## Running the Project

Strat the backend
```aiignore
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python main.py
```



import httpx
import sys

def main():
    print("==================================================")
    print("🚀 ContextHub Verification Script starting...")
    print("==================================================")

    base_url = "http://127.0.0.1:8000"

    # Using httpx.Client with a long timeout (120 seconds) to allow
    # the local sentence-transformers model to download and load on the backend.
    with httpx.Client(timeout=120.0) as client:
        # Step 1: Health Check
        print("\nStep 1: Pinging /health...")
        try:
            r = client.get(f"{base_url}/health")
            if r.status_code == 200:
                print("✅ Health check passed:")
                print(r.json())
            else:
                print(f"❌ Health check failed with status {r.status_code}")
                return
        except Exception as e:
            print(f"❌ Failed to connect to server at {base_url}. Make sure it is running!")
            print(e)
            return

        # Step 2: Create a Project & API Key
        print("\nStep 2: Creating verification project...")
        project_payload = {
            "name": "Verification Test Project",
            "description": "Checking API operations",
            "email": "test@contexthub.dev"
        }
        r = client.post(f"{base_url}/api/v1/projects", json=project_payload)
        if r.status_code != 200:
            print(f"❌ Project creation failed: {r.text}")
            return
        data = r.json()
        api_key = data["api_key"]
        project_id = data["project"]["id"]
        print("✅ Project and API key generated successfully:")
        print(f"   Project ID: {project_id}")
        print(f"   API Key:    {api_key}")

        headers = {"X-API-Key": api_key}

        # Step 3: Insert Context Document (triggers embedding calculation)
        print("\nStep 3: Creating context document (calculating embeddings)...")
        doc_payload = {
            "category": "architecture",
            "title": "Service Gateway Spec",
            "body": "FastAPI is mounted on port 8000. Realtime sync updates Next.js dashboard."
        }
        r = client.post(f"{base_url}/api/v1/context", json=doc_payload, headers=headers)
        if r.status_code != 200:
            print(f"❌ Context creation failed: {r.text}")
            return
        print("✅ Context document created successfully.")

        # Step 4: Semantic Search
        print("\nStep 4: Executing semantic search check...")
        r = client.get(f"{base_url}/api/v1/context/search?query=FastAPI port", headers=headers)
        if r.status_code != 200:
            print(f"❌ Semantic search failed: {r.text}")
            return
        search_results = r.json()
        print("✅ Semantic search successfully matched:")
        for doc in search_results:
            print(f"   - Match: '{doc['title']}' (Score: {doc.get('similarity', 'N/A')})")

        # Step 5: Log Architectural Decision
        print("\nStep 5: Logging architectural decision...")
        decision_payload = {
            "title": "Use Local Sentence-Transformers",
            "reason": "Offers zero host cost",
            "alternatives": "OpenAI Embedding API",
            "impact": "CPU-bound processing"
        }
        r = client.post(f"{base_url}/api/v1/decisions", json=decision_payload, headers=headers)
        if r.status_code != 200:
            print(f"❌ Decision logging failed: {r.text}")
            return
        print("✅ Architectural decision logged successfully.")

        # Step 6: Log Agent Session End
        print("\nStep 6: Recording session completion...")
        session_payload = {
            "agent_name": "VerifyBot",
            "summary": "Completed initial automated check of the ContextHub stack.",
            "added": ["verify_contexthub.py"],
            "changed": [],
            "removed": [],
            "known_issues": []
        }
        r = client.post(f"{base_url}/api/v1/sessions", json=session_payload, headers=headers)
        if r.status_code != 200:
            print(f"❌ Session logging failed: {r.text}")
            return
        print("✅ Session summary recorded successfully.")

        print("\n==================================================")
        print("🎉 Verification Complete: All systems operational!")
        print("==================================================")

if __name__ == "__main__":
    main()

import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

class SupabaseClient:
    def __init__(self, url, key):
        self.url = url
        self.key = key
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    def select(self, table, column, value):
        res = requests.get(f"{self.url}/rest/v1/{table}?{column}=eq.{value}", headers=self.headers)
        if res.status_code >= 400:
            print(f"Supabase select error: {res.text}")
            return None
        return res.json()

    def insert(self, table, data):
        res = requests.post(f"{self.url}/rest/v1/{table}", headers=self.headers, json=data)
        if res.status_code >= 400:
            print(f"Supabase insert error: {res.text}")
            raise Exception(f"Supabase insert error: {res.text}")
        return res.json()

    def update(self, table, data, column, value):
        res = requests.patch(f"{self.url}/rest/v1/{table}?{column}=eq.{value}", headers=self.headers, json=data)
        if res.status_code >= 400:
            print(f"Supabase update error: {res.text}")
            raise Exception(f"Supabase update error: {res.text}")
        return res.json()

    def upload_file(self, bucket, file_name, file_bytes, content_type):
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": content_type
        }
        res = requests.post(f"{self.url}/storage/v1/object/{bucket}/{file_name}", headers=headers, data=file_bytes)
        if res.status_code >= 400:
            raise Exception(res.text)
        return True

    def get_public_url(self, bucket, file_name):
        return f"{self.url}/storage/v1/object/public/{bucket}/{file_name}"

if SUPABASE_URL and SUPABASE_KEY:
    supabase = SupabaseClient(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase = None
    print("Warning: SUPABASE_URL or SUPABASE_KEY is missing. Database operations will fail.")

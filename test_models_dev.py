import requests
import json

resp = requests.get("https://models.dev/api.json").json()

# Flatten all models from all providers
all_models = {}
for provider_id, provider_data in resp.items():
    models = provider_data.get("models", {})
    for m_id, m_data in models.items():
        if m_id not in all_models:
            all_models[m_id] = m_data

print(f"Total unique models in models.dev: {len(all_models)}")

# Let's inspect a well known model
sample = all_models.get("llama-3.3-70b-instruct", None)
if sample:
    print(json.dumps(sample, indent=2))
else:
    # try finding it
    for m in all_models:
        if "70b" in m.lower() and "llama" in m.lower():
            print(m)

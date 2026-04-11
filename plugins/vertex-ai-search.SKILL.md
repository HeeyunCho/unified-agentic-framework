# SKILL: Vertex AI Search & Grounding
## Metadata
- **ID**: skill_vertex_search_v1
- **Source**: Google Codelab (March 2026)
- **Role**: RAG / DEPLOYMENT
- **Category**: Grounding / Infrastructure

## Description
Implements an enterprise-grade search system grounded in private PDF/Text data using Vertex AI Agent Builder.

## 🛠️ Implementation Steps (Lab Standard)
1. **Data Ingestion**: 
   - Create GCS Bucket: `gs://[PROJECT_ID]-search-data`
   - Upload source documents (PDF/Markdown).
2. **Data Store Configuration**:
   - Initialize Vertex AI Data Store linked to the GCS bucket.
   - Set indexing type to 'Search' or 'Conversational'.
3. **Agent Setup**:
   - Create an Agent in Vertex AI Agent Builder.
   - Link the Data Store to the Agent.
4. **Cloud Run Deployment**:
   - Containerize the search app using the standard `google-cloud-sdk` image.
   - Deploy to Cloud Run with ADC authentication enabled.

## [ASSERT] Success Criteria
- API call `search()` returns results with 'grounding_metadata'.
- Hallucination score < 0.05.
- Sub-second retrieval latency.

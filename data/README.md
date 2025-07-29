# Data Directory

This directory contains data files for the ingestion pipeline.

## Structure

```
data/
├── incoming/     # Files to be processed by the ingestion pipeline
├── processed/    # Successfully processed files (optional)
└── failed/       # Files that failed processing (optional)
```

## Supported File Types

- CSV (`.csv`, `.tsv`)
- Excel (`.xlsx`, `.xls`)
- JSON (`.json`)
- Parquet (`.parquet`)
- Text files (`.txt`)

## Usage

Place files in the `incoming/` directory and run the ingestion pipeline:

```bash
# From project root
python backend/main.py --directories data/incoming
```

## Note

Data files are excluded from git for security and privacy reasons. Only this README is tracked.
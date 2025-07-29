# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack data ingestion module. The **backend** is written in Python and handles file detection, metadata extraction (checksum, row count, column names), and ingest logging. The **frontend** is built using React with [shadcn/ui](https://ui.shadcn.com) to display file metadata and ingestion logs in a clean, modern interface.

## Development Commands

### Backend

```bash
# Run the ingestion script
python main.py

# Install dependencies
pip install -r requirements.txt

# Run tests (if added)
pytest tests/
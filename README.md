# Brain Extraction Preprocessing Pipeline

A reproducible neuroimaging preprocessing pipeline for skull stripping using FSL BET (Brain Extraction Tool).

**Author:** Tara Neddersen  
**Lab:** Knowles Lab, Stanford University Department of Neurology  
**Course:** BIOS 278 - Reproducibility and Data Science in Computational Brain Image Analysis  
**Date:** December 2024

## Overview

This pipeline performs brain extraction (skull stripping) on T1w anatomical MRI images. Brain extraction is a fundamental preprocessing step that removes non-brain tissue (skull, scalp, etc.) from structural MRI images, leaving only the brain tissue. This is typically the first step in many neuroimaging analysis pipelines.

The pipeline is designed to be fully reproducible using Docker containers and follows BIDS (Brain Imaging Data Structure) data organization standards.

## Features

- BIDS-compatible input/output
- Docker containerized for reproducibility
- Comprehensive logging and metadata tracking
- Error handling and input validation
- Command-line interface
- Processing metadata saved with each run

## Requirements

- **Docker** (for running the container)
- **BIDS-formatted input data**
- ~2-3 GB disk space for Docker image
- Internet connection (for first-time Docker image pull)

## Easiest way of running the analysis:

- clone the Dataset (git clone https://github.com/Tara-Neddersen/Tara_Neddersen_FinalProject.git)
- navigate to the dataset folder (cd Tara_Neddersen_FinalProject)
- run this command: ./run.sh 0051160
- you can see the results generated in a folder named "Results" in the same dataset folder.

## If this did not work for any reason you can proceed with the guidance bellow: 

## Installation

### Option 1: Using Docker (Recommended)

```bash
# Clone this repository
git clone https://github.com/Tara-Neddersen/Tara_Neddersen_FinalProject.git
cd Tara_Neddersen_FinalProject

# Build Docker image
docker build -t brain-extraction:v1.0 .

# On Apple Silicon (M1/M2), force amd64 to match the base image
docker build --platform=linux/amd64 -t brain-extraction:v1.0 .

# Verify installation
docker run brain-extraction:v1.0 --help
```

### Option 2: Local Installation 

Run locally without Docker:

1. Install FSL: https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FslInstallation
2. Install Python 3.8+
3. No additional Python packages required (uses the Python standard library only).

This script only uses the following Python standard library modules, which are included with any Python 3.8+ installation:
- `argparse`
- `logging`
- `subprocess`
- `sys`
- `pathlib`
- `json`
- `datetime`
- `os`

```bash
# Make script executable
chmod +x code/brain_extraction.py

# Run directly
python code/brain_extraction.py --input data/ --output results/ --subject 0051160
```

## Usage

### Basic Usage

Process a single subject (uses the Docker entrypoint):

```bash
docker run \
    --platform=linux/amd64 \  # include this flag on Apple Silicon (M1/M2)
    -v $(pwd)/data:/data:ro \
    -v $(pwd)/results:/results \
    brain-extraction:v1.0 \
    --input /data \
    --output /results \
    --subject 0051160
```

**On Windows PowerShell:**
```powershell
docker run `
    -v ${PWD}/data:/data:ro `
    -v ${PWD}/results:/results `
    brain-extraction:v1.0 `
    --input /data `
    --output /results `
    --subject 0051160
```

### Custom Parameters

Adjust the fractional intensity threshold (controls brain mask size):

```bash
docker run \
    -v $(pwd)/data:/data:ro \
    -v $(pwd)/results:/results \
    brain-extraction:v1.0 \
    --input /data \
    --output /results \
    --subject 0051160 \
    --f 0.4
```

Lower values (e.g., 0.4) = larger brain mask (more conservative)  
Higher values (e.g., 0.6) = smaller brain mask (more aggressive)

### Process Multiple Subjects

If you have multiple subjects, process them in a loop:

```bash
for sub in 0051160 0051161 0051162; do
    docker run \
        -v $(pwd)/data:/data:ro \
        -v $(pwd)/results:/results \
        brain-extraction:v1.0 \
        --input /data \
        --output /results \
        --subject $sub
done
```

## Input/Output

### Input Format

- **BIDS-formatted dataset** with T1w anatomical images
- Expected structure:
  ```
  data/
  ├── dataset_description.json
  └── sub-XXXXXX/
      └── anat/
          └── sub-XXXXXX_T1w.nii.gz
  ```

### Output Format

- Brain-extracted images: `results/sub-XXXXXX/sub-XXXXXX_T1w_brain.nii.gz`
- Processing metadata: `results/sub-XXXXXX/processing_metadata.json`

The metadata file contains:
- Timestamp
- Software versions (FSL, Python)
- Parameters used
- Input/output file paths

## Parameters

- `--input`: Path to BIDS dataset directory (required)
- `--output`: Path to output directory (required)
- `--subject`: Subject ID without 'sub-' prefix, e.g., '0051160' (required)
- `--f` or `--fractional-intensity`: BET fractional intensity threshold (0-1, default: 0.5)
- `--verbose`: Enable verbose logging (optional)

## Examples

### Example 1: Process Test Subject

```bash
# Using the provided test data
docker run \
    -v $(pwd)/data:/data:ro \
    -v $(pwd)/results:/results \
    brain-extraction:v1.0 \
    --input /data \
    --output /results \
    --subject 0051160
```

### Example 2: Custom Threshold

```bash
# Use more conservative threshold (larger brain mask)
docker run \
    -v $(pwd)/data:/data:ro \
    -v $(pwd)/results:/results \
    brain-extraction:v1.0 \
    --input /data \
    --output /results \
    --subject 0051160 \
    --f 0.4
```

## Reproducibility

This pipeline is designed for maximum reproducibility:

- **Version Control**: All code in Git repository
- **Containerized**: Docker image with pinned software versions
- **Documented**: Comprehensive README and code comments
- **Metadata**: Processing metadata saved with each run
- **BIDS Compatible**: Follows BIDS data organization standards

### Software Versions

- **Base Image**: nipreps/fmriprep:24.1.1 (includes FSL/BET)
- **Python**: 3.x (from base image)
- **FSL**: Provided by base image (version recorded in metadata)

## Testing

Tests are not required for running the pipeline. None are included in this repository.

## Troubleshooting

### Issue: "FSL BET not found"

**Solution**: Make sure you're using the Docker container. FSL is pre-installed in the container. If running locally, install FSL separately.

### Issue: "Input file not found"

**Solution**: 
- Check that your data follows BIDS structure
- Verify subject ID is correct (without 'sub-' prefix)
- Ensure data directory is mounted correctly with `-v` flag

### Issue: "Permission denied"

**Solution**: 
- Check that output directory is writable
- On Windows, ensure Docker has access to the drive
- Try running with `--user` flag if needed

### Issue: Docker build fails

**Solution**:
- Ensure Docker is running
- Check internet connection (needs to pull base image)
- Try: `docker pull nipreps/fmriprep:24.1.1` first

## Project Structure

```
final_project_bios278/
├── README.md                 # This file
├── Dockerfile                # Docker container definition
├── requirements.txt          # Python dependencies
├── .gitignore               # Git ignore file
│
├── code/                     # Source code
│   └── brain_extraction.py  # Main preprocessing script
│
├── data/                     # Input data (BIDS format)
│   ├── dataset_description.json
│   ├── README
│   └── sub-0051160/
│       └── anat/
│           ├── sub-0051160_T1w.nii.gz
│           └── sub-0051160_T1w.json
│
├── results/                  # Output directory (sample output included)
│   └── sub-0051160/
│       ├── sub-0051160_T1w_brain.nii.gz
│       └── processing_metadata.json  # regenerate by running the pipeline
│
└── docs/                     # Additional documentation
    └── USAGE_EXAMPLES.md
```



## Acknowledgments

- FSL (FMRIB Software Library) for the BET tool
- BIDS community for data organization standards
- ABIDE dataset for test data
- BIOS 278 course instructors

## Contact

For questions or issues:
- **Author**: Tara Neddersen
- **Lab**: Knowles Lab, Stanford University Department of Neurology
- **Email**: tara.neddersen@stanford.edu

---

**Last Updated**: December 2024




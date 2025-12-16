#!/usr/bin/env python3
"""
Brain Extraction Preprocessing Pipeline

Performs skull stripping on T1w anatomical images using FSL BET (Brain Extraction Tool).
This is a simple preprocessing step that removes non-brain tissue from MRI images.

Usage:
    python brain_extraction.py --input <bids_dir> --output <output_dir> [--subject <sub_id>] [--f <fractional_intensity>]

Example:
    python brain_extraction.py --input /data --output /results --subject 0051160

Author: Tara Neddersen
Lab: Knowles Lab, Stanford University Department of Neurology
Date: December 2024
"""

import argparse
import logging
import subprocess
import sys
from pathlib import Path
import json
from datetime import datetime
import os

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


def check_fsl():
    """Check if FSL is available in the environment."""
    try:
        result = subprocess.run(['which', 'bet'], capture_output=True, text=True)
        if result.returncode != 0:
            # Try Windows path or check FSLDIR
            if 'FSLDIR' in os.environ:
                return True
            logger.error("FSL BET not found. Make sure FSL is installed and in PATH.")
            return False
        return True
    except FileNotFoundError:
        # On Windows, try different approach
        if 'FSLDIR' in os.environ:
            return True
        logger.error("FSL not found. This script requires FSL to be installed.")
        return False


def validate_input(input_path):
    """Validate that input file exists and is a NIfTI file."""
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")
    
    if not str(input_path).endswith(('.nii', '.nii.gz')):
        raise ValueError(f"Input must be a NIfTI file (.nii or .nii.gz), got: {input_path}")
    
    logger.info(f"Input file validated: {input_path}")
    return True


def run_bet(input_file, output_file, fractional_intensity=0.5):
    """
    Run FSL BET (Brain Extraction Tool) to perform skull stripping.
    
    Parameters:
    -----------
    input_file : Path
        Input T1w anatomical image
    output_file : Path
        Output brain-extracted image (without .nii.gz extension for BET)
    fractional_intensity : float
        BET fractional intensity threshold (0-1). Lower = larger brain mask.
        Default is 0.5 which works well for most T1w images.
    
    Returns:
    --------
    Path to output file
    """
    logger.info(f"Running FSL BET on: {input_file}")
    logger.info(f"Fractional intensity threshold: {fractional_intensity}")
    
    # BET expects output without extension
    output_base = str(output_file).replace('.nii.gz', '').replace('.nii', '')
    
    # Build BET command
    # -f: fractional intensity threshold
    # -R: robust brain center estimation (recommended for T1w)
    cmd = ['bet', str(input_file), output_base, '-f', str(fractional_intensity), '-R']
    
    logger.info(f"Command: {' '.join(cmd)}")
    
    # Ensure PATH contains system utilities (dc required by BET)
    env = os.environ.copy()
    env["PATH"] = f"/usr/bin:{env.get('PATH', '')}"
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            env=env
        )
        logger.info("BET completed successfully")
        
        # BET adds .nii.gz extension, so check if file exists
        output_with_ext = Path(f"{output_base}.nii.gz")
        if not output_with_ext.exists():
            # Try without .gz
            output_with_ext = Path(f"{output_base}.nii")
        
        if output_with_ext.exists():
            logger.info(f"Output saved to: {output_with_ext}")
            return output_with_ext
        else:
            raise FileNotFoundError(f"BET output file not found: {output_base}")
            
    except subprocess.CalledProcessError as e:
        logger.error(f"BET failed with error: {e.stderr}")
        raise RuntimeError(f"Brain extraction failed: {e.stderr}")
    except Exception as e:
        logger.error(f"Unexpected error during BET: {e}")
        raise


def save_metadata(output_dir, input_file, output_file, parameters):
    """
    Save processing metadata for reproducibility.
    
    This includes software versions, parameters used, and timestamps.
    """
    metadata = {
        'timestamp': datetime.now().isoformat(),
        'script_version': '1.0.0',
        'author': 'Tara Neddersen',
        'lab': 'Knowles Lab, Stanford University Department of Neurology',
        'input_file': str(input_file),
        'output_file': str(output_file),
        'parameters': parameters,
        'software_versions': {}
    }
    
    # Try to get FSL version
    try:
        result = subprocess.run(['bet', '-V'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            metadata['software_versions']['fsl_bet'] = result.stdout.strip()
    except:
        try:
            # Alternative way to get FSL version
            if 'FSLDIR' in os.environ:
                version_file = Path(os.environ['FSLDIR']) / 'etc' / 'fslversion'
                if version_file.exists():
                    with open(version_file) as f:
                        metadata['software_versions']['fsl'] = f.read().strip()
        except:
            metadata['software_versions']['fsl'] = 'unknown'
    
    # Python version
    metadata['software_versions']['python'] = sys.version.split()[0]
    
    # Save metadata
    metadata_file = output_dir / 'processing_metadata.json'
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    logger.info(f"Metadata saved to: {metadata_file}")
    return metadata_file


def process_subject(bids_dir, subject_id, output_dir, fractional_intensity):
    """
    Process a single subject's T1w image.
    
    Parameters:
    -----------
    bids_dir : Path
        Root directory of BIDS dataset
    subject_id : str
        Subject ID without 'sub-' prefix (e.g., '0051160')
    output_dir : Path
        Output directory for results
    fractional_intensity : float
        BET fractional intensity parameter
    """
    logger.info(f"Processing subject: sub-{subject_id}")
    
    # Construct BIDS-compliant input path
    input_file = bids_dir / f'sub-{subject_id}' / 'anat' / f'sub-{subject_id}_T1w.nii.gz'
    
    if not input_file.exists():
        raise FileNotFoundError(f"Input file not found: {input_file}")
    
    # Create output directory for this subject
    subject_output_dir = output_dir / f'sub-{subject_id}'
    subject_output_dir.mkdir(parents=True, exist_ok=True)
    
    # Output file (BIDS-compliant naming)
    output_file = subject_output_dir / f'sub-{subject_id}_T1w_brain.nii.gz'
    
    # Validate input
    validate_input(input_file)
    
    # Run brain extraction
    result_file = run_bet(input_file, output_file, fractional_intensity)
    
    # Save metadata
    parameters = {
        'fractional_intensity': fractional_intensity,
        'subject_id': subject_id
    }
    save_metadata(subject_output_dir, input_file, result_file, parameters)
    
    logger.info(f"Successfully processed sub-{subject_id}")
    return result_file


def main():
    """Main execution function."""
    parser = argparse.ArgumentParser(
        description='Brain extraction preprocessing using FSL BET',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process single subject
  python brain_extraction.py --input /data --output /results --subject 0051160
  
  # With custom fractional intensity
  python brain_extraction.py --input /data --output /results --subject 0051160 --f 0.4
        """
    )
    
    parser.add_argument(
        '--input',
        type=Path,
        required=True,
        help='Path to BIDS dataset directory'
    )
    
    parser.add_argument(
        '--output',
        type=Path,
        required=True,
        help='Path to output directory'
    )
    
    parser.add_argument(
        '--subject',
        type=str,
        required=True,
        help='Subject ID without sub- prefix (e.g., 0051160)'
    )
    
    parser.add_argument(
        '--f',
        '--fractional-intensity',
        type=float,
        default=0.5,
        dest='fractional_intensity',
        help='BET fractional intensity threshold (0-1, default: 0.5)'
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    logger.info("=" * 60)
    logger.info("Brain Extraction Preprocessing Pipeline")
    logger.info("Author: Tara Neddersen")
    logger.info("=" * 60)
    
    # Check FSL is available
    if not check_fsl():
        logger.error("FSL not found. Please ensure FSL is installed and in your PATH.")
        sys.exit(1)
    
    # Validate input directory
    if not args.input.exists():
        logger.error(f"Input directory not found: {args.input}")
        sys.exit(1)
    
    # Create output directory
    args.output.mkdir(parents=True, exist_ok=True)
    
    try:
        # Process subject
        result_file = process_subject(
            args.input,
            args.subject,
            args.output,
            args.fractional_intensity
        )
        
        logger.info("=" * 60)
        logger.info("Processing completed successfully!")
        logger.info(f"Output saved to: {result_file}")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"Error during processing: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()


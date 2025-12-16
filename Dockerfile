FROM nipreps/fmriprep:24.1.1

WORKDIR /app

# Copy the entire project into the container
COPY . /app

# Install any optional Python dependencies (pytest for tests)
RUN apt-get update && apt-get install -y --no-install-recommends bc dc \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir -r requirements.txt

# Default entrypoint to run the pipeline directly
ENTRYPOINT ["python", "/app/code/brain_extraction.py"]


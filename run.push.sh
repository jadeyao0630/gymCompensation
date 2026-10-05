#!/bin/bash
cd gymCompensation
git add .
git commit -m "${1:-update}" --no-verify
git push
cd ../
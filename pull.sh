#!/bin/bash
mv .env.local ../.env.local
git pull
mv ../.env.local .env.local
SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('history', 'folders');

import logging
import json
import threading
from datetime import datetime

# Thread-local storage for correlation IDs
_thread_locals = threading.local()

def get_correlation_id():
    return getattr(_thread_locals, 'correlation_id', None)

def set_correlation_id(c_id):
    _thread_locals.correlation_id = c_id

class JSONFormatter(logging.Formatter):
    """
    Formatter that outputs JSON strings after parsing the LogRecord.
    """
    def format(self, record):
        log_record = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'message': record.getMessage(),
            'logger': record.name,
            'module': record.module,
            'line': record.lineno,
            'correlation_id': get_correlation_id() or 'unknown',
        }
        
        # Add extra fields if present
        if hasattr(record, 'extra_data'):
            log_record.update(record.extra_data)
            
        if record.exc_info:
            log_record['exception'] = self.formatException(record.exc_info)

        return json.dumps(log_record)

def get_logger(name):
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger

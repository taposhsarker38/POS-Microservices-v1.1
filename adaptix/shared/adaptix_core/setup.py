from setuptools import setup, find_packages

setup(
    name='adaptix_core',
    version='0.1.0',
    packages=find_packages(),
    install_requires=[
        'django',
        'djangorestframework',
        'pyjwt',
        'pika',
        'requests'
    ],
    description='Core shared implementation for Adaptix microservices',
    author='Adaptix Team',
)

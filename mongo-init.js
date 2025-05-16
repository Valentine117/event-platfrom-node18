db = db.getSiblingDB('event-reward-platform-dev');

db.createCollection('sample_collection');

db.sample_collection.insertMany([{ key: 'value' }]);

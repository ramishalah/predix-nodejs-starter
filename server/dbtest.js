/* TODO
use await/async (express promise router)
return all data as json
open/close connectino
| grep PG, also after certain time / indicator of new run
run postgress locally/return json locally
	they can test locally, but must test after cf push to make sure
*/

// DB code
// var Client = require('pg').Client;
// var client = new Client();

var Pool = require('pg').Pool;
var pool = new Pool();

pool.on('error', (err, client) => {
	console.error('PG:', 'Unexpected error on idle client', err);
});

// function connect() {
// 	return client.connect()
// 	.then(() => console.log('PG:', 'Connected'))
// 	.catch((e) => console.log('PG:', 'Connection Error', e));
// }

// function disconnect() {
// 	return client.end()
// 	.then(() => console.log('PG:', 'Disconnected'))
// 	.catch(() => console.log('PG:', 'Error disconnecting'));
// }

// function testQuery() {
// 	return client.query('select * from dosewatch_exams where id=9450')
// 	.then((result) => console.log('PG:', 'result', result))
// 	.catch((e) => console.log('PG:', 'error', e.stack));
// }

// q can be query string (sql) or query config object
function query(q) {
	return pool.query(q)
	.then((result) => {
		console.log('PG:', 'result', result.rowCount);//, result);
		return result.rows;
	})
	.catch((e) => {
		console.error('PG:', 'error', e.stack);
	});
}

function fetchExams() {
	return query('select * from dosewatch_exams where facility_id=1616');
}

function fetchExamsArray() {
	return query(
		{
			text: 'select * from dosewatch_exams where facility_id=1616',
			rowMode: 'array'
		}
	);
}

// function exams() {
// 	return Promise.resolve(fetchExams());
// }

// function examsArray() {
// 	return Promise.resolve(fetchExamsArray());
// }

// connect();
// testQuery();

// DB routes
var express = require('express');
var router = express.Router();

router.get('/exams', function(req, res, next) {
	Promise.resolve(fetchExams()).then(
		(rows) => {
			console.log('PG:', '/exams', rows);
			res.json(rows);
		}
	);
});

router.get('/exams_array', function(req, res, next) {
	Promise.resolve(fetchExamsArray()).then(
		(rows) => {
			console.log('PG:', '/exams_array', rows);
			res.json(rows);
		}
	);
});

module.exports = router;

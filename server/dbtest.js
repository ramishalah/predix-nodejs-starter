/* TODO
use await/async (express promise router)
return all data as json
open/close connectino
| grep PG, also after certain time / indicator of new run
run postgress locally/return json locally
	they can test locally, but must test after cf push to make sure
*/

// DB code
var Pool = require('pg').Pool;
var pool = new Pool();

pool.on('error', (err, client) => {
	console.error('PG:', 'Unexpected error on idle client', err);
});

// q can be query string (sql) or query config object
function query(q) {
	return pool.query(q)
	.then((result) => {
		console.log('PG:', 'result', result.rowCount);//, result);
		return result;
	})
	.catch((e) => {
		console.error('PG:', 'error', e.stack);
	});
}

function fetchExams() {
	return query('select * from dosewatch_exams');
}

function byMonth(facility_id, year) {
	return query({
		name: 'bymonth',
		text: 	'select ' +
				  'extract(month from exam_datetime) as month_number, ' +
				  'avg(ctdi_vol_max) as ctdi_avg, ' +
				  'avg(normalized_dlp) as dlp_avg, ' +
				  'count(id) as exams ' +
				'from dosewatch_exams ' +
				'where facility_id = $1 and extract(year from exam_datetime) = $2 ' +
				'group by extract(month from exam_datetime)',
		values: [facility_id, year],
		rowMode: 'array'
	});
}

function byProtocol(facility_id, year) {
	return query({
		name: 'byprotocol',
		text: 	'select ' +
				  'protocol_name, ' +
				  'avg(ctdi_vol_max) as ctdi_avg, ' +
				  'avg(normalized_dlp) as dlp_avg ' +
				'from dosewatch_exams ' +
				'where facility_id = $1 and extract(year from exam_datetime) = $2 ' +
				'group by protocol_name',
		values: [facility_id, year],
		rowMode: 'array'
	});
}

function byMachine(facility_id, year) {
	return query({
		name: 'bymachine',
		text: 	'select ' +
				  'machine_name, ' +
				  'avg(ctdi_vol_max) as ctdi_avg, ' +
				  'avg(normalized_dlp) as dlp_avg ' +
				'from dosewatch_exams ' +
				'where facility_id = $1 and extract(year from exam_datetime) = $2 ' +
				'group by machine_name',
		values: [facility_id, year],
		rowMode: 'array'
	});
}

function byHospital(year) {
	return query({
		name: 'byhospital',
		text:	'select ' +
				  'facility_name, ' +
				  'avg(ctdi_vol_max) as ctdi_avg, ' +
				  'avg(normalized_dlp) as dlp_avg ' +
				'from dosewatch_exams ' +
				'where extract(year from exam_datetime) = $1 ' +
				'group by facility_name',
		values: [year],
		rowMode: 'array'
	});
}

function forRank(year) {
	return query({
		name: 'forrank',
		text:	'select ' +
		          'facility_id, ' +
		          'rank() over (order by avg(ctdi_vol_max)) as ctdi_rank, ' +
		          'rank() over (order by avg(normalized_dlp)) as dlp_rank ' +
		        'from dosewatch_exams ' +
		        'where extract(year from exam_datetime) = $1 ' +
		        'group by facility_id',
		values: [year],
		rowMode: 'array'
	});
}

// DB routes
var express = require('express');
var router = express.Router();

router.get('/exams', function(req, res, next) {
	Promise.resolve(fetchExams()).then(
		(result) => {
			res.send('Count: ' + result.rowCount);
		}
	);
});

router.get('/:facility_id/:year/months', function(req, res, next) {
	Promise.resolve(byMonth(req.params.facility_id, req.params.year)).then(
		(result) => {
			var rows = result.rows;
			var data = {
				ctdi: { values: [] },
				dlp: { values: [] },
				exams: { values: [] }
			};

			var missing = ['-1', 'missing', 'missing', 'missing'];
			for (var i = 0; i < 12; i++) {
				// optimize
				var month_row = rows.find((e) => e[0] == i) || missing;

				var ctdi = month_row[1];
				data.ctdi.values.push(ctdi);

				var dlp = month_row[2];
				data.dlp.values.push(dlp);

				var exam_count = month_row[3];
				data.exams.values.push(exam_count);
			}
			res.json(data);
		}
	);
});

router.get('/:facility_id/:year/protocols', function(req, res, next) {
	Promise.resolve(byProtocol(req.params.facility_id, req.params.year)).then(
		(result) => {
			var rows = result.rows;
			var data = {
				names: [],
				ctdi: [],
				dlp: []
			};

			for (var i = 0; i < rows.length; i++) {
				var row = rows[i];

				var name = row[0];
				data.names.push(name);

				var ctdi = row[1];
				data.ctdi.push(ctdi);

				var dlp = row[2];
				data.dlp.push(dlp);
			}
			res.json(data);
		}
	);
});

router.get('/:facility_id/:year/machines', function(req, res, next) {
	Promise.resolve(byMachine(req.params.facility_id, req.params.year)).then(
		(result) => {
			var rows = result.rows;
			var data = {
				names: [],
				ctdi: [],
				dlp: []
			};

			for (var i = 0; i < rows.length; i++) {
				var row = rows[i];

				var name = row[0];
				data.names.push(name);

				var ctdi = row[1];
				data.ctdi.push(ctdi);

				var dlp = row[2];
				data.dlp.push(dlp);
			}
			res.json(data);
		}
	);
});

router.get('/:facility_id/:year/hospitals', function(req, res, next) {
	Promise.resolve(byHospital(req.params.year)).then(
		(result) => {
			var rows = result.rows;
			var data = {
				names: [],
				ctdi: [],
				dlp: []
			};

			for (var i = 0; i < rows.length; i++) {
				var row = rows[i];

				var name = row[0];
				data.names.push(name);

				var ctdi = row[1];
				data.ctdi.push(ctdi);

				var dlp = row[2];
				data.dlp.push(dlp);
			}
			res.json(data);
		}
	);
});

router.get('/:facility_id/:year/rank', function(req, res, next) {
	Promise.resolve(forRank(req.params.year)).then(
		(result) => {
			var rows = result.rows;
			var data = {
				ctdi: '0',
				dlp: '0',
				total: '0'
			};

			data.ctdi = rows.find((e) => e[0] == req.params.facility_id)[1];
			data.dlp = rows.find((e) => e[0] == req.params.facility_id)[2];
			data.total = rows.length;

			res.json(data);
		}
	);
});

module.exports = router;

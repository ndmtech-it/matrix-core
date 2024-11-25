import ipc from 'node-ipc';

import Agenda from 'agenda';

import matrix_system from '/opt/git/matrix-system/matrix-system.js';

ipc.config.id = 'core';
ipc.config.retry = 1500;

ipc.serve( startModules =>
{
	ipc.server.on('connect', () =>
	{
		ipc.log('Module joined');
	});

	ipc.server.on('disconnect', () =>
	{
		ipc.log('Module leaved');
	});

	ipc.server.on('socket.disconnected', (socket, destroyedSocketID) =>
	{
		ipc.log('Module ' + destroyedSocketID + ' has disconnected!');
	});

	ipc.server.on('getConfig', (module) =>
	{
		ipc.log('Module ' + module + ' has requested configs');
		ipc.server.emit('configs')
	});

	ipc.server.on( 'message',	(data,socket) =>
	{
		ipc.log('got a message : '.debug, data);
		ipc.server.emit(socket,	'message', data+' world!');
	});
	
	
});

function startModules()
{
	let mod_system = new matrix_system();
}

let agenda = new Agenda(
	{
		db:
		{
			address: 'mongodb://127.0.0.1/matrix',
			options: { useNewUrlParser: true },
			collection: `scheduledTasks` // Start fresh every time
		}
});

agenda.define(
	'long-running job',
	{
		lockLifetime: 5 * 1000, // Max amount of time the job should take
		concurrency: 3 // Max number of job instances to run at the same time
	},
	async(job, done) =>
	{
		const thisJob = jobRunCount++;
		console.log(`#${thisJob} started`);

		// 3 job instances will be running at the same time, as specified by `concurrency` above
		await sleep(30 * 1000);
		// Comment the job processing statement above, and uncomment one of the blocks below

		/*
	// Imagine a job that takes 8 seconds. That is longer than the lockLifetime, so
	// we'll break it into smaller chunks (or set its lockLifetime to a higher value).
	await sleep(4 * 1000);  // 4000 < lockLifetime of 5000, so the job still has time to finish
	await job.touch();      // tell Agenda the job is still running, which resets the lock timeout
	await sleep(4 * 1000);  // do another chunk of work that takes less than the lockLifetime
	*/

		// Only one job will run at a time because 3000 < lockLifetime
		// await sleep(3 * 1000);

		console.log(`#${thisJob} finished`);
		done();
});

(async function()
	{
  console.log(time(), 'Agenda started');
  agenda.processEvery('1 second');
  await agenda.start();
  await agenda.every('1 second', 'long-running job');

  // Log job start and completion/failure
  agenda.on('start', (job) => {
    console.log(time(), `Job <${job.attrs.name}> starting`);
  });
  agenda.on('success', (job) => {
    console.log(time(), `Job <${job.attrs.name}> succeeded`);
  });
  agenda.on('fail', (error, job) => {
    console.log(time(), `Job <${job.attrs.name}> failed:`, error);
  });
})();

console.log('Starting Matrix Core IPC... ');
ipc.server.start();
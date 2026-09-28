const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: "login-604d8",
    clientEmail: "firebase-adminsdk-fbsvc@login-604d8.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQD0AsuLY7+PmElO\ncs9hznlFYQJ7hIAIXb8wCSftjZ8+RAwrT37pmlqvEklvR1cfRhayJptKms/gpQJA\nkk4pKXlxRdQCTmIYY5qQWZCOBoagmv0essbXdv39NFNo+/+uGNFnXV6Cu6J4VrVx\ntCtR4wiWrY5+vwQbpUhv2bn/zimeyHTpKzKxD054b0eo1kD9LwYYFBVQxlFM4lD/\nJufAB9x6U6FZi+NLZ5GvMBWmyfukopD7nkvkofmGSwxIBh1Agpf6WF4KlQ8Zc+aQ\nTf44UprxH7T3qdmQVd7c/4HpA1/QNnpQvhhcPXIrRd1wdmVrIT5HSGDqRaDA/uIf\nW44kBOupAgMBAAECggEADX4bkvg3qxkmwY6d6si74jMaa+nQWhYT+LQi5/L3MZ5Z\n5WmyiPiK5+gdFSkG12D854o0t0/+62s4aAlnBsXnNBUiQ2Ph7vsP/IglUwMnndkg\nIrrMPbUT15TVgWZA1bfD2YE7VQOK2PhjdVd69z7Udl9/tAC8OYqeyieKDkvwN3o+\nvbapr7d/nd663VQrwGi9nZVJjhkZG4IkSUaFYBoXTYJ2rpMHrC3tiu3adAxCOwKz\nhx0VtNVxhQFKsJQ0uBAY71ZOFaQLBtOE2nYhpJVVKNCOyJvQntHWIGCf5O7ec2Jg\nNH6/vK6VKl42SEV1sGxB/Lok8S/KgoqynE8REwHFoQKBgQD/83J159vDy/2X/C0p\n4RfHB5kxTwvuLw7YTaB2nPktot2hD4Ff4CQcIP+/ww/1BYfRH+rvhZtS4fGHyw89\nIyXya9EIZsRrFoPz6qClIGCtzcuQMyNBY9RcHsCua8D1LcetUhTLfJm/nu/XxCOa\njk8eRsPo6vFWiwL7wghCCLi9SQKBgQD0DsMsUkv4JMSjsAN2hksvQLxd2Mwqb5qQ\n0J8crxCGwzP42fXeRu/xpjby6tr8yr+wO5cLvQgply3okAKJc9mqqA7OXPXUvNSC\nFqB+FhVjsUCEBHoTEttasPtwvFViKn5xGQyyGbqvSxRpOjfu8ViiiHE06FzeLwLS\nJsbZshqbYQKBgQCs79fBtLR3mggxvhDiABXpw8eNWoSMHb2hBupJ2ow+epHXNjvL\nBQ5A90b2UZ0hh+gZs8AwsIyfNszUXK5iN7J3FsQ5Mf67AI6Nq1V53OOV67wEJZlH\noGUnDRxRfbr1rkYBZLlqODlGEOSrW/pWfpsUsOnEIaKJQAn3A0ZDH9N7CQKBgDol\nYj6nBM6EBA1zm/+bE0KYy8gYJNxfZpXl/mKZGvjgfPtnAnsIr5YFIcZSSgY8T9su\n91emm9E84YUs+k3BOjS8gXqND0y2CHNN7MLdhA8SZeqOHn942KYM0HsVg8o1kZZk\nf2/XTXECFETVyAm3moRuuXn/elC9JpDnCC1Jj6lBAoGAAWjRPRm5trz6QibtyBW9\nknICW1QGR6Kl/cSw5Kpa5PaLbnAs4Grb+Wi7rwqq4Y47SxAVlQIziRsD/BRNVgQ2\n8tXpEmt+81ObRFBKrtstrHWuVasR3Aud2hQmUhEiAuDckv22wqfm1ZNd7ZxmxHJh\ndtPlKEUnK/Ey0o5xDAe8a0I=\n-----END PRIVATE KEY-----"
  })
});

const db = admin.firestore();

async function backfill() {
  const ticketsSnap = await db.collection('helpdesk_tickets').get();
  let count = 0;
  for (const doc of ticketsSnap.docs) {
    const data = doc.data();
    if (!data.reporterEmail && data.reportedBy) {
      const userSnap = await db.collection('users').doc(data.reportedBy).get();
      if (userSnap.exists) {
        const userData = userSnap.data();
        if (userData.email) {
          await doc.ref.update({ reporterEmail: userData.email });
          count++;
          console.log(`Updated ticket ${doc.id} with email ${userData.email}`);
        }
      }
    }
  }
  console.log(`Finished updating ${count} tickets.`);
}

backfill().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

const fs = require('fs');
let code = fs.readFileSync('e:/yadiapp-project/inventory - Copy/web/src/components/register-design/CustomerSendHistoryModal.tsx', 'utf8');

code = code.replace(
  /const \[history, setHistory\] = useState<any\[\]>\(\[\]\);/,
  `const [transfers, setTransfers] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const history = [...transfers, ...links].sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));`
);

code = code.replace(
  /const q = query\(collection\(db, "customer_transfers"\)\);\s*const unsubscribe = onSnapshot\(q, \(snapshot\) => \{\s*const docs = snapshot\.docs\.map\(doc => \(\{ id: doc\.id, \.\.\.doc\.data\(\) \}\)\);\s*docs\.sort\(\(a: any, b: any\) => \(b\.createdAt\?\.toMillis\(\) \|\| 0\) - \(a\.createdAt\?\.toMillis\(\) \|\| 0\)\);\s*setHistory\(docs\);\s*\}\);\s*return \(\) => unsubscribe\(\);/,
  `const q1 = query(collection(db, "customer_transfers"));
    const unsub1 = onSnapshot(q1, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const d = doc.data();
        return { id: doc.id, type: 'transfer', ...d };
      });
      setTransfers(docs);
    });

    const q2 = query(collection(db, "customer_links"));
    const unsub2 = onSnapshot(q2, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          type: 'link',
          subject: 'Link: ' + (d.itemName || d.designNo),
          recipientEmail: d.customerEmail,
          senderName: d.senderName,
          status: 'sent',
          files: [d.originalFileId],
          createdAt: d.createdAt
        };
      });
      setLinks(docs);
    });

    return () => { unsub1(); unsub2(); };`
);

code = code.replace(
  /const handleDeleteTransfer = async \(id: string\) => \{/,
  `const handleDeleteTransfer = async (id: string, type: string = "transfer") => {`
);

code = code.replace(
  /await deleteDoc\(doc\(db, 'customer_transfers', id\)\);/,
  `if (type === 'link') {
        await deleteDoc(doc(db, 'customer_links', id));
      } else {
        await deleteDoc(doc(db, 'customer_transfers', id));
      }`
);

code = code.replace(
  /onClick=\{\(\) => handleDeleteTransfer\(h\.id\)\}/,
  `onClick={() => handleDeleteTransfer(h.id, h.type)}`
);

code = code.replace(
  /value=\{`\$\{window\.location\.origin\}\/public\/transfer\?id=\$\{h\.id\}`\}/g,
  `value={h.type === 'link' ? \`\${window.location.origin}/download?id=\${h.id}\` : \`\${window.location.origin}/public/transfer?id=\${h.id}\`}`
);

code = code.replace(
  /navigator\.clipboard\.writeText\(`\$\{window\.location\.origin\}\/public\/transfer\?id=\$\{h\.id\}`\);/,
  `navigator.clipboard.writeText(h.type === 'link' ? \`\${window.location.origin}/download?id=\${h.id}\` : \`\${window.location.origin}/public/transfer?id=\${h.id}\`);`
);

code = code.replace(
  /window\.open\(`\$\{window\.location\.origin\}\/public\/transfer\?id=\$\{h\.id\}`,\s*'_blank'\)/,
  `window.open(h.type === 'link' ? \`\${window.location.origin}/download?id=\${h.id}\` : \`\${window.location.origin}/public/transfer?id=\${h.id}\`, "_blank")`
);

fs.writeFileSync('e:/yadiapp-project/inventory - Copy/web/src/components/register-design/CustomerSendHistoryModal.tsx', code);
console.log('done');

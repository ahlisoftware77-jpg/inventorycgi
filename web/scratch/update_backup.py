import re

def main():
    filepath = 'src/app/backup/page.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The block we want to replace starts with:
    # for (const collectionName in backupData) {
    # and ends with:
    # await restoreBatch.commit();
    # Let's replace the whole batching logic

    old_logic = """          for (const collectionName in backupData) {
            const querySnapshot = await getDocs(collection(db, collectionName));
            const deleteBatch = writeBatch(db);
            querySnapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
            await deleteBatch.commit();
          }

          const restoreBatch = writeBatch(db);
          for (const collectionName in backupData) {
            const collectionData = backupData[collectionName];
            collectionData.forEach((item: any) => {
              const { _id, ...data } = item;
              const docRef = doc(db, collectionName, _id);
              restoreBatch.set(docRef, data);
            });
          }
          await restoreBatch.commit();"""

    new_logic = """          // Hapus data lama dengan batasan 500 operasi per batch
          for (const collectionName in backupData) {
            const querySnapshot = await getDocs(collection(db, collectionName));
            const docs = querySnapshot.docs;
            for (let i = 0; i < docs.length; i += 500) {
              const deleteBatch = writeBatch(db);
              const chunk = docs.slice(i, i + 500);
              chunk.forEach(doc => deleteBatch.delete(doc.ref));
              await deleteBatch.commit();
            }
          }

          // Restore data baru dengan batasan 500 operasi per batch
          for (const collectionName in backupData) {
            const collectionData = backupData[collectionName];
            for (let i = 0; i < collectionData.length; i += 500) {
              const restoreBatch = writeBatch(db);
              const chunk = collectionData.slice(i, i + 500);
              chunk.forEach((item: any) => {
                const { _id, ...data } = item;
                const docRef = doc(db, collectionName, _id);
                restoreBatch.set(docRef, data);
              });
              await restoreBatch.commit();
            }
          }"""

    new_content = content.replace(old_logic, new_logic)

    if content == new_content:
        print("Replacement failed: substring not found")
        return

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Successfully updated backup logic.")

if __name__ == "__main__":
    main()

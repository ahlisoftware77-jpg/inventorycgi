import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const connectedHosts = new Set<string>();

export async function ensureSmbConnection(sharePath: string) {
  // Kita butuh Host + ShareName (misal: \\192.168.15.130\Document Control Center)
  const match = sharePath.match(/^[/\\]{2}([^/\\]+)[/\\]+([^/\\]+)/);
  let targetToConnect = sharePath;
  let host = '';
  if (match) {
    host = match[1];
    targetToConnect = `\\\\${match[1]}\\${match[2]}`;
  }
  
  // Deteksi kredensial per-IP (mendukung format _USER_ atau _USERNAME_)
  let safeHost = host.replace(/\./g, '_').toUpperCase();
  let username = process.env[`SMB_USER_${safeHost}`] || process.env[`SMB_USERNAME_${safeHost}`] || process.env.SMB_USERNAME;
  let password = process.env[`SMB_PASS_${safeHost}`] || process.env[`SMB_PASSWORD_${safeHost}`] || process.env.SMB_PASSWORD;
  
  if (!username || !password) {
    // Jika tidak ada kredensial, gunakan akses default OS
    return;
  }
  
  if (connectedHosts.has(targetToConnect)) {
    return;
  }
  
  try {
    const cmd = `net use "${targetToConnect}" "${password}" /user:"${username}"`;
    await execAsync(cmd);
    connectedHosts.add(targetToConnect);
    console.log(`[SMB] Successfully authenticated to ${targetToConnect}`);
  } catch (error: any) {
    const errorMsg = error.message || '';
    if (errorMsg.includes('1219')) {
      console.log(`[SMB] Session conflict for ${targetToConnect}, attempting to disconnect and reconnect...`);
      try {
        await execAsync(`net use "${targetToConnect}" /delete /yes`).catch(() => {});
        const cmd = `net use "${targetToConnect}" "${password}" /user:"${username}"`;
        await execAsync(cmd);
        connectedHosts.add(targetToConnect);
        console.log(`[SMB] Successfully re-authenticated to ${targetToConnect}`);
      } catch (retryError: any) {
        console.error(`[SMB] Failed to re-authenticate to ${targetToConnect}:`, retryError.message);
      }
    } else {
      console.error(`[SMB] Failed to authenticate to ${targetToConnect}:`, errorMsg);
    }
  }
}

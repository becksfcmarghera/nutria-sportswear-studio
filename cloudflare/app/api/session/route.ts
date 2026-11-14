import {isAdmin} from '../../admin';
export const dynamic='force-dynamic';
export async function GET(){return Response.json({isAdmin:await isAdmin()},{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}})}

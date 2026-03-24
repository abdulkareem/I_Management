declare module 'express' {
  export type Request = any;
  export type Response = any;
  export type NextFunction = any;
  export type Router = any;
  const e: any;
  export function Router(): any;
  export default e;
}

declare module 'cors' {
  const cors: any;
  export default cors;
}

declare module 'morgan' {
  const morgan: any;
  export default morgan;
}

declare module 'express-async-errors';

declare module 'jsonwebtoken' {
  const jwt: any;
  export default jwt;
}

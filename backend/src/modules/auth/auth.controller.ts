import type { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service";

export async function signup(
  req: Request,
  res: Response
) {
  const user = await authService.signup(req.body);

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: user,
  });
}

export async function login(
  req: Request,
  res: Response
) {
  const result = await authService.login(req.body);

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: result,
  });
}

export async function me(
  req: Request,
  res: Response
) {
  const user = await authService.getCurrentUser(
    req.user!.id
  );

  res.status(200).json({
    success: true,
    data: user,
  });
}



export async function refresh(
  req: Request,
  res: Response
) {
  const result = await authService.refreshAccessToken(
    req.body
  );

  res.status(200).json({
    success: true,
    message: "Access token refreshed",
    data: result,
  });
}

export async function logout(
  req: Request,
  res: Response
) {
  await authService.logout(req.body.refreshToken);

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
}

export async function updateMe(req:Request, res:Response, next:NextFunction){
  if(Object.keys(req.body).length === 0){
    return res.status(400).json({'message':'Provide atleast one field to update'})
  }
  try{
    const updateUser =  await authService.updateCurrentUser( req.user!.id, req.body )
    return res.status(200).json(updateUser)
  }catch(e){
    next(e)
  }
}
export async function resendVerification(req: Request, res: Response, next: NextFunction){


  if(!req.body.email){
    return res.status(400).json({'message':'Email is required'})
  }
  const email = req.body.email;
  try{
    await authService.resendVerificationEmail(email);
    return res.status(200).json({"message":"If an eligible account exists, a verification email will be sent."})
  }catch(e){
    next(e);
  }
}

export async function verifyEmail(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { token } = req.body;

    await authService.verifyEmail(token);

    return res.status(200).json({
      message: "Email verified successfully",
    });
  } catch (error) {
    next(error);
  }
}

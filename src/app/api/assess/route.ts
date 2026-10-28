import { assess } from "@/lib/api/assessment";
import { errorResponse, parseBody } from "@/lib/api/http";
import { assessmentInputSchema } from "@/lib/api/schema";

export async function POST(request: Request) {
  try {
    return Response.json(
      { data: assess(await parseBody(request, assessmentInputSchema)) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

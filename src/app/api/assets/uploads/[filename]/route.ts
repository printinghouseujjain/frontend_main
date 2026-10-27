import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in/api";

/* ─────────────────────────────────────────
   GET CLIENT IP
───────────────────────────────────────── */

function getClientIp(request: NextRequest): string {
    const forwardedFor = request.headers.get("x-forwarded-for");

    if (forwardedFor) {
        return forwardedFor.split(",")[0].trim();
    }

    const realIp = request.headers.get("x-real-ip");

    if (realIp) {
        return realIp.trim();
    }

    return "";
}

/* ─────────────────────────────────────────
   GET IMAGE
───────────────────────────────────────── */

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ filename: string }> },
): Promise<NextResponse> {
    try {
        const { filename } = await context.params;

        // Allow filenames only, not nested paths.
        if (
            !filename ||
            filename === "." ||
            filename === ".." ||
            /[/\\]/.test(filename)
        ) {
            return NextResponse.json(
                { message: "Invalid image filename." },
                { status: 400 },
            );
        }

        const incomingCookie = request.headers.get("cookie");
        const clientIp = getClientIp(request);

        const response = await fetch(
            `${API_URL}/assets/uploads/${encodeURIComponent(filename)}`,
            {
                method: "GET",
                headers: {
                    Accept: "image/*",

                    ...(incomingCookie
                        ? { Cookie: incomingCookie }
                        : {}),

                    ...(clientIp
                        ? {
                              "X-Forwarded-For": clientIp,
                              "X-Real-IP": clientIp,
                          }
                        : {}),
                },
                cache: "no-store",
            },
        );

        if (!response.ok) {
            return NextResponse.json(
                { message: "Unable to fetch image." },
                { status: response.status },
            );
        }

        const contentType =
            response.headers.get("content-type") ?? "";

        if (!contentType.toLowerCase().startsWith("image/")) {
            return NextResponse.json(
                { message: "The requested resource is not an image." },
                { status: 415 },
            );
        }

        return new NextResponse(await response.arrayBuffer(), {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        console.error("Image proxy error:", error);

        return NextResponse.json(
            { message: "Unable to fetch image." },
            { status: 500 },
        );
    }
}

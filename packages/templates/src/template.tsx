export interface OgTemplateProps {
  title: string;
  description?: string;
  siteName?: string;
}

export const StandardOgTemplate = ({
  title,
  description,
  siteName,
}: OgTemplateProps) => (
  <div
    tw="flex flex-col w-full h-full items-center justify-between"
    style={{
      backgroundColor: "#0a0a0b",
      color: "#e4e4e7",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "64px",
    }}
  >
    <div
      tw="flex w-full"
      style={{
        backgroundColor: "#6366f1",
        borderRadius: "3px",
        height: "6px",
        left: "0",
        position: "absolute",
        right: "0",
        top: "0",
      }}
    />

    <div tw="flex flex-col items-center justify-center flex-1">
      <div tw="flex flex-col items-center" style={{ maxWidth: "800px" }}>
        <h1
          tw="text-center font-bold m-0 leading-tight"
          style={{
            color: "#e4e4e7",
            fontSize: title.length > 35 ? "56px" : "72px",
            lineHeight: "1.1",
          }}
        >
          {title}
        </h1>
        {description ? (
          <p
            tw="text-center m-0 mt-6 font-normal"
            style={{
              color: "#a1a1aa",
              fontSize: "28px",
              lineHeight: "1.4",
            }}
          >
            {description}
          </p>
        ) : null}
      </div>
    </div>

    <div tw="flex flex-col items-center w-full">
      <div
        tw="w-24"
        style={{
          backgroundColor: "#2a2a2e",
          height: "1px",
          marginBottom: "16px",
        }}
      />
      {siteName ? (
        <p
          tw="text-center m-0 font-medium"
          style={{
            color: "#71717a",
            fontSize: "20px",
            letterSpacing: "0.05em",
          }}
        >
          {siteName}
        </p>
      ) : null}
    </div>
  </div>
);

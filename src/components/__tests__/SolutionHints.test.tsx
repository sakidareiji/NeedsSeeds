import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MasterHint, AdviceHint, SolutionHints } from "@/components/SolutionHints";
import type { SolutionHint } from "@/lib/solutions";

const affiliate: SolutionHint = {
  id: "ps-1",
  source: "master",
  pitchText: "確定申告を自動化できます。",
  solution: { id: "s-1", name: "クラウド会計", isAffiliate: true },
};

const nonAffiliate: SolutionHint = {
  id: "ps-2",
  source: "master",
  pitchText: "公的な案内ページです。",
  solution: { id: "s-2", name: "国税庁の案内", isAffiliate: false },
};

const advice: SolutionHint = {
  id: "ps-3",
  source: "ai_generated",
  pitchText: "まずは経費を記録することから始めるとよいでしょう。",
  solution: null,
};

const DISCLAIMER = "AIによる一般的な情報であり、専門的な助言ではありません。";

describe("PR表記の強制(F4 / 景表法ステマ規制)", () => {
  it("アフィリエイト案件には必ず PR 表記が出る", () => {
    render(<MasterHint hint={affiliate} />);
    expect(screen.getByText("PR")).toBeInTheDocument();
  });

  it("非アフィリエイトには PR 表記を出さない", () => {
    render(<MasterHint hint={nonAffiliate} />);
    expect(screen.queryByText("PR")).not.toBeInTheDocument();
  });

  it("リンクはクリック計測エンドポイント /go/[id] を経由する", () => {
    render(<MasterHint hint={affiliate} />);
    const link = screen.getByRole("link", { name: "クラウド会計" });
    expect(link).toHaveAttribute("href", "/go/ps-1");
    expect(link.getAttribute("rel")).toContain("sponsored");
  });
});

describe("一般アドバイスの注記強制(F4)", () => {
  it("一般アドバイスには必ず『専門的な助言ではない』注記が付く", () => {
    render(<AdviceHint hint={advice} />);
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
  });
});

describe("SolutionHints セクション", () => {
  it("マスタ提示と一般アドバイスを混在表示できる", () => {
    render(<SolutionHints hints={[affiliate, advice]} />);
    expect(screen.getByText("解決のヒント")).toBeInTheDocument();
    expect(screen.getByText("PR")).toBeInTheDocument();
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
  });

  it("ヒントが無ければ何も描画しない(センシティブ/NG投稿)", () => {
    const { container } = render(<SolutionHints hints={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
